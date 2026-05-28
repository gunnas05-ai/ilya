import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('blockchain_anchors')
export class BlockchainAnchor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  documentId: string;

  @Column({ length: 30 })
  documentType: string; // 'e_fatura', 'e_arsiv', 'e_irsaliye', 'pod'

  @Column({ length: 128 })
  documentHash: string; // SHA-512 hash of document content

  @Column({ length: 128 })
  chainHash: string; // Previous anchor hash + document hash → new chain hash

  @Column()
  blockIndex: number; // Sequential block number

  @Column({ length: 128 })
  previousBlockHash: string; // Links to previous anchor

  @Column({ length: 128 })
  merkleRoot: string; // Merkle root for this block

  @Column('timestamp')
  anchoredAt: Date;

  @Column({ length: 20, default: 'KAPTAN_PRIVATE' })
  network: string; // 'ETH_GOERLI', 'POLYGON_MUMBAI', 'KAPTAN_PRIVATE'

  @Column({ nullable: true, length: 100 })
  transactionHash: string; // Real blockchain tx hash if available

  @CreateDateColumn()
  createdAt: Date;
}
